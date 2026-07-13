package com.example.absensiprototype.ui.attendance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.attendance.AttendanceRepository
import com.example.absensiprototype.domain.model.PunchType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AttendanceUiState(
    val isLoading: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val pendingCount: Int = 0,
)

class AttendanceViewModel(
    private val repository: AttendanceRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AttendanceUiState(pendingCount = repository.pendingCount()))
    val uiState: StateFlow<AttendanceUiState> = _uiState.asStateFlow()

    init {
        flushQueue()
    }

    fun clockIn() = punch(PunchType.CLOCK_IN)
    fun clockOut() = punch(PunchType.CLOCK_OUT)

    fun flushQueue() {
        viewModelScope.launch {
            runCatching { repository.flushPending() }
                .onSuccess { sent ->
                    _uiState.update {
                        it.copy(
                            pendingCount = repository.pendingCount(),
                            message = if (sent > 0) "$sent absensi offline berhasil dikirim" else it.message,
                        )
                    }
                }
        }
    }

    private fun punch(type: PunchType) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, message = null) }
            try {
                val record = repository.punch(type)
                val label = if (type == PunchType.CLOCK_IN) "Clock-in" else "Clock-out"
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = "$label berhasil (${record.locationName ?: "lokasi OK"})",
                        pendingCount = repository.pendingCount(),
                    )
                }
            } catch (e: ApiException) {
                val friendly = when (e.code) {
                    "OUTSIDE_GEOFENCE" -> "Di luar area kantor (geofence)."
                    "OFFLINE_QUEUED" -> e.message
                    else -> e.message
                }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = friendly,
                        pendingCount = repository.pendingCount(),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Gagal absen",
                        pendingCount = repository.pendingCount(),
                    )
                }
            }
        }
    }
}
