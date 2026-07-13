package com.example.absensiprototype.data.api

class ApiException(
    val code: String,
    override val message: String,
) : Exception(message)
