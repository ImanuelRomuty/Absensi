package com.example.absensiprototype.data.session

interface TokenStore {
    var accessToken: String?
    var refreshToken: String?
    var email: String?
    var role: String?
    var employeeId: String?
    var employeeName: String?
    var pendingPunchesJson: String?

    fun clearSession()
}
