package com.example.absensiprototype.data.attendance

import com.benasher44.uuid.uuid4
import com.example.absensiprototype.data.api.ApiException
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.data.session.TokenStore
import com.example.absensiprototype.domain.model.AttendanceRecord
import com.example.absensiprototype.domain.model.PendingPunch
import com.example.absensiprototype.domain.model.PunchType
import com.example.absensiprototype.platform.LocationProvider
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlin.time.Clock

class AttendanceRepository(
    private val api: MasarifApi,
    private val locationProvider: LocationProvider,
    private val tokenStore: TokenStore,
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun punch(type: PunchType): AttendanceRecord {
        val location = locationProvider.currentLocation()
        val key = uuid4().toString()
        return try {
            api.clock(
                type = type,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracyMeters,
                idempotencyKey = key,
            )
        } catch (e: ApiException) {
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
