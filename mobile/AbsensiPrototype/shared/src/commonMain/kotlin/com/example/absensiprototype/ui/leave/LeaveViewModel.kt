package com.example.absensiprototype.ui.leave

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.domain.model.LeaveBalance
import com.example.absensiprototype.domain.model.LeaveRequest
import com.example.absensiprototype.domain.model.LeaveType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LeaveUiState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val types: List<LeaveType> = emptyList(),
    val balances: List<LeaveBalance> = emptyList(),
    val requests: List<LeaveRequest> = emptyList(),
    val selectedTypeId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reason: String = "",
    val message: String? = null,
    val error: String? = null,
)

class LeaveViewModel(
    private val api: MasarifApi,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LeaveUiState())
    val uiState: StateFlow<LeaveUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun onTypeChange(id: String) = _uiState.update { it.copy(selectedTypeId = id, error = null) }
    fun onStartChange(value: String) = _uiState.update { it.copy(startDate = value, error = null) }
    fun onEndChange(value: String) = _uiState.update { it.copy(endDate = value, error = null) }
    fun onReasonChange(value: String) = _uiState.update { it.copy(reason = value, error = null) }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val types = api.leaveTypes()
                val balances = api.myLeaveBalances()
                val requests = api.myLeaveRequests()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        types = types,
                        balances = balances,
                        requests = requests,
                        selectedTypeId = it.selectedTypeId.ifBlank { types.firstOrNull()?.id.orEmpty() },
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Gagal memuat data cuti",
                    )
                }
            }
        }
    }

    fun submit() {
        val state = _uiState.value
        if (state.selectedTypeId.isBlank() || state.startDate.isBlank() || state.endDate.isBlank()) {
            _uiState.update { it.copy(error = "Jenis cuti, tanggal mulai, dan selesai wajib diisi (YYYY-MM-DD)") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null, message = null) }
            try {
                api.submitLeave(
                    leaveTypeId = state.selectedTypeId,
                    startDate = state.startDate.trim(),
                    endDate = state.endDate.trim(),
                    reason = state.reason.trim().ifBlank { null },
                )
                val balances = api.myLeaveBalances()
                val requests = api.myLeaveRequests()
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        balances = balances,
                        requests = requests,
                        reason = "",
                        message = "Pengajuan cuti dikirim. Menunggu approval.",
                    )
                }
            } catch (e: ApiException) {
                _uiState.update { it.copy(isSubmitting = false, error = e.message) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Gagal mengajukan cuti")
                }
            }
        }
    }

    fun cancel(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null, message = null) }
            try {
                api.cancelLeave(id)
                val requests = api.myLeaveRequests()
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        requests = requests,
                        message = "Pengajuan cuti dibatalkan.",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Gagal membatalkan")
                }
            }
        }
    }
}
