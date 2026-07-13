package com.example.absensiprototype.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.domain.model.UserSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "ani@masarif.local",
    val password: String = "Password123!",
    val isLoading: Boolean = false,
    val error: String? = null,
    val session: UserSession? = null,
)

class LoginViewModel(
    private val api: MasarifApi,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState(session = api.currentSession()))
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) = _uiState.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _uiState.update { it.copy(password = value, error = null) }

    fun login() {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _uiState.update { it.copy(error = "Email dan password wajib diisi") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val session = api.login(state.email, state.password)
                _uiState.update { it.copy(isLoading = false, session = session) }
            } catch (e: ApiException) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            } catch (e: Exception) {
                val message = when {
                    e.message?.contains("timeout", ignoreCase = true) == true ||
                        e.message?.contains("Socket", ignoreCase = true) == true ->
                        "Server masih bangun (Render cold start). Coba lagi dalam beberapa detik."
                    else -> e.message ?: "Gagal login. Cek koneksi / API."
                }
                _uiState.update { it.copy(isLoading = false, error = message) }
            }
        }
    }
}
