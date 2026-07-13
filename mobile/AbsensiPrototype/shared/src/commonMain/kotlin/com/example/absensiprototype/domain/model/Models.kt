package com.example.absensiprototype.domain.model

import kotlinx.serialization.Serializable

data class UserSession(
    val accessToken: String,
    val refreshToken: String,
    val email: String,
    val role: String,
    val employeeId: String?,
    val employeeName: String?,
)

data class GeoPoint(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double? = null,
)

@Serializable
enum class PunchType {
    CLOCK_IN,
    CLOCK_OUT,
}

data class AttendanceRecord(
    val id: String,
    val type: PunchType,
    val recordedAt: String,
    val locationName: String?,
    val isLate: Boolean,
    val isEarly: Boolean,
)

@Serializable
data class PendingPunch(
    val type: PunchType,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double? = null,
    val idempotencyKey: String,
    val createdAtEpochMs: Long,
)
