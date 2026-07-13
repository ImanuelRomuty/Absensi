package com.example.absensiprototype.platform

import com.example.absensiprototype.domain.model.GeoPoint

actual class PlatformContextHolder {
    actual companion object {
        actual fun setup(context: Any?) = Unit
    }
}

actual class LocationProvider actual constructor() {
    actual suspend fun currentLocation(): GeoPoint {
        throw IllegalStateException("GPS iOS belum diaktifkan di fase ini. Pakai Android dulu.")
    }
}
