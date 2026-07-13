package com.example.absensiprototype.platform

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.core.content.ContextCompat
import com.example.absensiprototype.domain.model.GeoPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

actual class PlatformContextHolder {
    actual companion object {
        @Volatile
        var appContext: Context? = null
            private set

        actual fun setup(context: Any?) {
            appContext = (context as? Context)?.applicationContext
        }
    }
}

actual class LocationProvider actual constructor() {
    @SuppressLint("MissingPermission")
    actual suspend fun currentLocation(): GeoPoint = withContext(Dispatchers.IO) {
        val context = PlatformContextHolder.appContext
            ?: throw IllegalStateException("Android context belum di-setup")

        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED && coarse != PackageManager.PERMISSION_GRANTED) {
            throw IllegalStateException("Izin lokasi belum diberikan")
        }

        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val providers = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER,
        )
        val last = providers
            .asSequence()
            .mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
            .maxByOrNull { it.time }

        if (last != null && System.currentTimeMillis() - last.time < 2 * 60 * 1000) {
            return@withContext last.toGeo()
        }

        val provider = when {
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
            manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
            else -> throw IllegalStateException("GPS/Network location tidak aktif")
        }

        suspendCancellableCoroutine { cont ->
            val listener = object : android.location.LocationListener {
                override fun onLocationChanged(location: Location) {
                    manager.removeUpdates(this)
                    if (cont.isActive) cont.resume(location.toGeo())
                }
            }
            try {
                manager.requestLocationUpdates(provider, 0L, 0f, listener, context.mainLooper)
            } catch (e: Exception) {
                if (cont.isActive) cont.resumeWithException(e)
            }
            cont.invokeOnCancellation {
                manager.removeUpdates(listener)
            }
        }
    }

    private fun Location.toGeo() = GeoPoint(
        latitude = latitude,
        longitude = longitude,
        accuracyMeters = accuracy.toDouble(),
    )
}
