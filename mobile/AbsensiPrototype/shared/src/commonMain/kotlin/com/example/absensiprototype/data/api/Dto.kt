package com.example.absensiprototype.data.api

import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorEnvelope(
    val error: ApiErrorBody? = null,
)

@Serializable
data class ApiErrorBody(
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class DataEnvelope<T>(
    val data: T,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class LoginData(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String? = null,
    val user: LoginUser,
)

@Serializable
data class LoginUser(
    val id: String,
    val email: String,
    val role: String,
    val employeeId: String? = null,
    val employee: LoginEmployee? = null,
)

@Serializable
data class LoginEmployee(
    val id: String,
    val name: String,
    val employeeCode: String? = null,
    val department: String? = null,
)

@Serializable
data class PunchRequest(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double? = null,
    val idempotencyKey: String,
)

@Serializable
data class AttendanceDto(
    val id: String,
    val type: String,
    val recordedAt: String,
    val isLate: Boolean = false,
    val isEarly: Boolean = false,
    val location: AttendanceLocationDto? = null,
)

@Serializable
data class AttendanceLocationDto(
    val id: String? = null,
    val name: String? = null,
)

@Serializable
data class AttendanceListEnvelope(
    val data: List<AttendanceDto>,
)

@Serializable
data class MeData(
    val id: String,
    val email: String,
    val role: String,
    val employeeId: String? = null,
    val employee: MeEmployee? = null,
)

@Serializable
data class MeEmployee(
    val id: String,
    val name: String,
    val employeeCode: String? = null,
    val department: String? = null,
    val locations: List<MeLocationDto> = emptyList(),
)

@Serializable
data class MeLocationDto(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int,
)
