package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Exposes the Android 12+ "Alarms & reminders" special-access state.
 *
 * expo-notifications schedules with `setExactAndAllowWhileIdle` only while
 * `AlarmManager.canScheduleExactAlarms()` is true and otherwise falls back to
 * an inexact alarm (see ExpoSchedulingDelegate.setupAlarm), which Doze can
 * delay by minutes. The app declares SCHEDULE_EXACT_ALARM, which Android 14+
 * leaves OFF by default for apps targeting API 33+, so the user has to flip
 * it on in system settings — this module lets the app read the state and
 * deep-link to that page.
 */
class ExactAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    // true on Android < 12 (no permission concept) and whenever the user has
    // granted "Alarms & reminders"; false means expo-notifications is
    // currently scheduling inexact alarms.
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.canScheduleExactAlarms()
    }

    // Opens the system "Alarms & reminders" page for this app (Android 12+).
    // Falls back to the app's details page if the OEM lacks that screen.
    // Returns false if nothing could be opened.
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val packageUri = Uri.fromParts("package", context.packageName, null)
      val exact = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (startActivitySafely(exact)) return@Function true
      val details = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      startActivitySafely(details)
    }
  }

  private fun startActivitySafely(intent: Intent): Boolean =
    try {
      context.startActivity(intent)
      true
    } catch (e: Exception) {
      false
    }
}
