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
    val isRefreshingGps: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val pendingCount: Int = 0,
    val debugLines: List<String> = emptyList(),
)

class AttendanceViewModel(
    private val repository: AttendanceRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AttendanceUiState(pendingCount = repository.pendingCount()))
    val uiState: StateFlow<AttendanceUiState> = _uiState.asStateFlow()

    init {
        flushQueue()
        refreshGps()
    }

    fun clockIn() = punch(PunchType.CLOCK_IN)
    fun clockOut() = punch(PunchType.CLOCK_OUT)

    fun refreshGps() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshingGps = true, error = null) }
            try {
                val debug = repository.loadGeofenceDebug()
                _uiState.update {
                    it.copy(
                        isRefreshingGps = false,
                        debugLines = debug.summaryLines(),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshingGps = false,
                        debugLines = emptyList(),
                        error = e.message ?: "Gagal membaca GPS / lokasi kantor",
                    )
                }
            }
        }
    }

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
                val debug = runCatching { repository.loadGeofenceDebug() }.getOrNull()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = "$label berhasil (${record.locationName ?: "lokasi OK"})",
                        pendingCount = repository.pendingCount(),
                        debugLines = debug?.summaryLines() ?: it.debugLines,
                    )
                }
            } catch (e: ApiException) {
                val friendly = when (e.code) {
                    "OUTSIDE_GEOFENCE" -> e.message
                    "OFFLINE_QUEUED" -> e.message
                    else -> e.message
                }
                val debug = runCatching { repository.loadGeofenceDebug() }.getOrNull()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = friendly,
                        pendingCount = repository.pendingCount(),
                        debugLines = debug?.summaryLines() ?: it.debugLines,
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
