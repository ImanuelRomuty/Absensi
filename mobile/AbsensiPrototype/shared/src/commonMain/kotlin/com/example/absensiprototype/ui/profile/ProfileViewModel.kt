package com.example.absensiprototype.ui.profile

import androidx.lifecycle.ViewModel
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.domain.model.UserSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class ProfileUiState(
    val session: UserSession? = null,
    val loggedOut: Boolean = false,
)

class ProfileViewModel(
    private val api: MasarifApi,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState(session = api.currentSession()))
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun logout() {
        api.logout()
        _uiState.update { it.copy(session = null, loggedOut = true) }
    }
}
