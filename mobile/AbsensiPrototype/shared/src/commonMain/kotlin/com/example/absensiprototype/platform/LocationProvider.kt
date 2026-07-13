package com.example.absensiprototype.platform

import com.example.absensiprototype.domain.model.GeoPoint

expect class LocationProvider() {
    suspend fun currentLocation(): GeoPoint
}

expect class PlatformContextHolder {
    companion object {
        fun setup(context: Any?)
    }
}
