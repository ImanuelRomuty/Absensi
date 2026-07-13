package com.example.absensiprototype.domain.geofence

import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** Haversine distance in meters (same formula as BE). */
fun distanceMeters(
    lat1: Double,
    lon1: Double,
    lat2: Double,
    lon2: Double,
): Double {
    val toRad = { deg: Double -> deg * PI / 180.0 }
    val r = 6_371_000.0
    val dLat = toRad(lat2 - lat1)
    val dLon = toRad(lon2 - lon1)
    val a =
        sin(dLat / 2).pow(2) +
            cos(toRad(lat1)) * cos(toRad(lat2)) * sin(dLon / 2).pow(2)
    return 2 * r * asin(sqrt(a))
}
