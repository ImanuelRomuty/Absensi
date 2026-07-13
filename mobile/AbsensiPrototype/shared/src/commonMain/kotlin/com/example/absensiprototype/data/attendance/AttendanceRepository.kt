package com.example.absensiprototype.data.attendance

import com.benasher44.uuid.uuid4
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.data.session.TokenStore
import com.example.absensiprototype.domain.geofence.distanceMeters
import com.example.absensiprototype.domain.model.AttendanceRecord
import com.example.absensiprototype.domain.model.GeoPoint
import com.example.absensiprototype.domain.model.OfficeLocation
import com.example.absensiprototype.domain.model.PendingPunch
import com.example.absensiprototype.domain.model.PunchType
import com.example.absensiprototype.platform.LocationProvider
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlin.math.roundToInt
import kotlin.time.Clock

data class GeofenceDebugInfo(
    val gps: GeoPoint,
    val offices: List<OfficeLocation>,
    val nearest: OfficeLocation?,
    val nearestDistanceMeters: Int?,
    val insideNearest: Boolean,
) {
    fun summaryLines(): List<String> {
        val accuracy = gps.accuracyMeters?.let { " (±${it.roundToInt()} m)" }.orEmpty()
        val gpsLine = "GPS Anda: ${coord(gps.latitude)}, ${coord(gps.longitude)}$accuracy"
        if (offices.isEmpty() || nearest == null || nearestDistanceMeters == null) {
            return listOf(gpsLine, "Kantor: belum di-assign ke akun ini")
        }
        return listOf(
            gpsLine,
            "Kantor: ${nearest.name}",
            "Titik kantor: ${coord(nearest.latitude)}, ${coord(nearest.longitude)}",
            "Radius: ${nearest.radiusMeters} m",
            "Jarak: $nearestDistanceMeters m → ${if (insideNearest) "MASUK area" else "DILUAR area"}",
        )
    }
}

private fun coord(value: Double): String {
    val scaled = (value * 1_000_000.0).roundToInt() / 1_000_000.0
    return scaled.toString()
}

class AttendanceRepository(
    private val api: MasarifApi,
    private val locationProvider: LocationProvider,
    private val tokenStore: TokenStore,
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun loadGeofenceDebug(): GeofenceDebugInfo {
        val gps = locationProvider.currentLocation()
        val offices = runCatching { api.myLocations() }.getOrDefault(emptyList())
        val nearest = offices.minByOrNull {
            distanceMeters(gps.latitude, gps.longitude, it.latitude, it.longitude)
        }
        val dist = nearest?.let {
            distanceMeters(gps.latitude, gps.longitude, it.latitude, it.longitude).roundToInt()
        }
        val inside = nearest != null && dist != null && dist <= nearest.radiusMeters
        return GeofenceDebugInfo(
            gps = gps,
            offices = offices,
            nearest = nearest,
            nearestDistanceMeters = dist,
            insideNearest = inside,
        )
    }

    suspend fun punch(type: PunchType): AttendanceRecord {
        val location = locationProvider.currentLocation()
        val key = uuid4().toString()
        try {
            return api.clock(
                type = type,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracyMeters,
                idempotencyKey = key,
            )
        } catch (e: ApiException) {
            if (e.code == "OUTSIDE_GEOFENCE") {
                throw ApiException(e.code, enrichOutsideMessage(location, e.message))
            }
            throw e
        } catch (e: Exception) {
            enqueue(
                PendingPunch(
                    type = type,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracyMeters = location.accuracyMeters,
                    idempotencyKey = key,
                    createdAtEpochMs = Clock.System.now().toEpochMilliseconds(),
                ),
            )
            throw ApiException(
                "OFFLINE_QUEUED",
                "Jaringan gagal. Absensi disimpan offline dan akan dikirim ulang.",
            )
        }
    }

    private suspend fun enrichOutsideMessage(location: GeoPoint, fallback: String?): String {
        return runCatching {
            val offices = api.myLocations()
            val nearest = offices.minByOrNull {
                distanceMeters(location.latitude, location.longitude, it.latitude, it.longitude)
            }
            val dist = nearest?.let {
                distanceMeters(
                    location.latitude,
                    location.longitude,
                    it.latitude,
                    it.longitude,
                ).roundToInt()
            }
            buildString {
                append("Di luar geofence.\n")
                append("GPS dikirim: ${coord(location.latitude)}, ${coord(location.longitude)}\n")
                if (nearest != null && dist != null) {
                    append("Kantor: ${nearest.name}\n")
                    append("Jarak ≈ $dist m (radius ${nearest.radiusMeters} m)")
                } else {
                    append("Tidak ada lokasi kantor ter-assign.")
                }
            }
        }.getOrElse { fallback ?: "Di luar area kantor (geofence)." }
    }

    suspend fun history(): List<AttendanceRecord> = api.myAttendance()

    suspend fun flushPending(): Int {
        val pending = loadPending()
        if (pending.isEmpty()) return 0
        val remaining = mutableListOf<PendingPunch>()
        var sent = 0
        for (item in pending) {
            try {
                api.clock(
                    type = item.type,
                    latitude = item.latitude,
                    longitude = item.longitude,
                    accuracy = item.accuracyMeters,
                    idempotencyKey = item.idempotencyKey,
                )
                sent += 1
            } catch (_: Exception) {
                remaining += item
            }
        }
        savePending(remaining)
        return sent
    }

    fun pendingCount(): Int = loadPending().size

    private fun enqueue(punch: PendingPunch) {
        val next = loadPending() + punch
        savePending(next)
    }

    private fun loadPending(): List<PendingPunch> {
        val raw = tokenStore.pendingPunchesJson ?: return emptyList()
        return runCatching {
            json.decodeFromString(ListSerializer(PendingPunch.serializer()), raw)
        }.getOrDefault(emptyList())
    }

    private fun savePending(items: List<PendingPunch>) {
        if (items.isEmpty()) {
            tokenStore.pendingPunchesJson = null
        } else {
            tokenStore.pendingPunchesJson =
                json.encodeToString(ListSerializer(PendingPunch.serializer()), items)
        }
    }
}
