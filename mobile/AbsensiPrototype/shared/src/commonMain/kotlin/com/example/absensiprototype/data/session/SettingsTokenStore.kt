package com.example.absensiprototype.data.session

import com.russhwolf.settings.Settings
import com.russhwolf.settings.set

class SettingsTokenStore(
    private val settings: Settings = Settings(),
) : TokenStore {
    override var accessToken: String?
        get() = settings.getStringOrNull(KEY_ACCESS)
        set(value) {
            if (value == null) settings.remove(KEY_ACCESS) else settings[KEY_ACCESS] = value
        }

    override var refreshToken: String?
        get() = settings.getStringOrNull(KEY_REFRESH)
        set(value) {
            if (value == null) settings.remove(KEY_REFRESH) else settings[KEY_REFRESH] = value
        }

    override var email: String?
        get() = settings.getStringOrNull(KEY_EMAIL)
        set(value) {
            if (value == null) settings.remove(KEY_EMAIL) else settings[KEY_EMAIL] = value
        }

    override var role: String?
        get() = settings.getStringOrNull(KEY_ROLE)
        set(value) {
            if (value == null) settings.remove(KEY_ROLE) else settings[KEY_ROLE] = value
        }

    override var employeeId: String?
        get() = settings.getStringOrNull(KEY_EMPLOYEE_ID)
        set(value) {
            if (value == null) settings.remove(KEY_EMPLOYEE_ID) else settings[KEY_EMPLOYEE_ID] = value
        }

    override var employeeName: String?
        get() = settings.getStringOrNull(KEY_EMPLOYEE_NAME)
        set(value) {
            if (value == null) settings.remove(KEY_EMPLOYEE_NAME) else settings[KEY_EMPLOYEE_NAME] = value
        }

    override var pendingPunchesJson: String?
        get() = settings.getStringOrNull(KEY_PENDING)
        set(value) {
            if (value == null) settings.remove(KEY_PENDING) else settings[KEY_PENDING] = value
        }

    override fun clearSession() {
        accessToken = null
        refreshToken = null
        email = null
        role = null
        employeeId = null
        employeeName = null
    }

    private companion object {
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_EMAIL = "email"
        const val KEY_ROLE = "role"
        const val KEY_EMPLOYEE_ID = "employee_id"
        const val KEY_EMPLOYEE_NAME = "employee_name"
        const val KEY_PENDING = "pending_punches"
    }
}
