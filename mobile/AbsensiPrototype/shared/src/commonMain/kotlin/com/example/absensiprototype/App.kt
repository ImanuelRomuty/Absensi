package com.example.absensiprototype

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.absensiprototype.data.api.MasarifApi
import com.example.absensiprototype.ui.attendance.AttendanceScreen
import com.example.absensiprototype.ui.auth.LoginScreen
import com.example.absensiprototype.ui.history.HistoryScreen
import com.example.absensiprototype.ui.profile.ProfileScreen
import org.koin.compose.koinInject

private object Routes {
    const val Login = "login"
    const val Main = "main"
    const val Attendance = "attendance"
    const val History = "history"
    const val Profile = "profile"
}

@Composable
fun App() {
    MaterialTheme {
        val api = koinInject<MasarifApi>()
        val rootNav = rememberNavController()
        val start = if (api.currentSession() != null) Routes.Main else Routes.Login

        NavHost(navController = rootNav, startDestination = start) {
            composable(Routes.Login) {
                LoginScreen(
                    onLoggedIn = {
                        rootNav.navigate(Routes.Main) {
                            popUpTo(Routes.Login) { inclusive = true }
                        }
                    },
                )
            }
            composable(Routes.Main) {
                MainShell(
                    onLoggedOut = {
                        rootNav.navigate(Routes.Login) {
                            popUpTo(Routes.Main) { inclusive = true }
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun MainShell(onLoggedOut: () -> Unit) {
    var tab by remember { mutableStateOf(Routes.Attendance) }
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == Routes.Attendance,
                    onClick = { tab = Routes.Attendance },
                    icon = { Text("A") },
                    label = { Text("Absensi") },
                )
                NavigationBarItem(
                    selected = tab == Routes.History,
                    onClick = { tab = Routes.History },
                    icon = { Text("R") },
                    label = { Text("Riwayat") },
                )
                NavigationBarItem(
                    selected = tab == Routes.Profile,
                    onClick = { tab = Routes.Profile },
                    icon = { Text("P") },
                    label = { Text("Profil") },
                )
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (tab) {
                Routes.Attendance -> AttendanceScreen()
                Routes.History -> HistoryScreen()
                Routes.Profile -> ProfileScreen(onLoggedOut = onLoggedOut)
            }
        }
    }
}
