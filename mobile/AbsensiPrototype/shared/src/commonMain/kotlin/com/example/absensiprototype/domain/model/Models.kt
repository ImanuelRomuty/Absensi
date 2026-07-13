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

data class OfficeLocation(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int,
)

data class LeaveType(
    val id: String,
    val code: String,
    val name: String,
    val paid: Boolean,
)

data class LeaveBalance(
    val id: String,
    val leaveTypeId: String,
    val leaveTypeName: String,
    val year: Int,
    val entitledDays: Int,
    val usedDays: Int,
    val remainingDays: Int,
)

data class LeaveRequest(
    val id: String,
    val leaveTypeName: String,
    val startDate: String,
    val endDate: String,
    val days: Int,
    val reason: String?,
    val status: String,
    val createdAt: String,
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
