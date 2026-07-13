package com.example.absensiprototype.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.attendance.AttendanceRepository
import com.example.absensiprototype.domain.model.AttendanceRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HistoryUiState(
    val isLoading: Boolean = false,
    val items: List<AttendanceRecord> = emptyList(),
    val error: String? = null,
    val isEmpty: Boolean = false,
)

class HistoryViewModel(
    private val repository: AttendanceRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(HistoryUiState(isLoading = true))
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val items = repository.history()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        items = items,
                        isEmpty = items.isEmpty(),
                    )
                }
            } catch (e: ApiException) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Gagal memuat riwayat")
                }
            }
        }
    }
}
