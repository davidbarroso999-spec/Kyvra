package com.kyvra.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.perf.FirebasePerformance
import com.google.firebase.perf.metrics.HttpMetric
import com.google.firebase.perf.metrics.Trace
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(name = "KyvraPerformance")
class KyvraPerformancePlugin : Plugin() {

    private val activeTraces = ConcurrentHashMap<String, Trace>()

    @PluginMethod
    fun startTrace(call: PluginCall) {
        val traceName = call.getString("traceName")
        if (traceName.isNullOrEmpty()) {
            call.reject("traceName is required")
            return
        }

        try {
            val trace = FirebasePerformance.getInstance().newTrace(traceName)
            trace.start()
            activeTraces[traceName] = trace
            
            val ret = JSObject()
            ret.put("status", "started")
            ret.put("traceName", traceName)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start trace: ${e.message}")
        }
    }

    @PluginMethod
    fun stopTrace(call: PluginCall) {
        val traceName = call.getString("traceName")
        if (traceName.isNullOrEmpty()) {
            call.reject("traceName is required")
            return
        }

        val trace = activeTraces.remove(traceName)
        if (trace == null) {
            call.reject("No active trace found for name: $traceName")
            return
        }

        try {
            val metrics = call.getObject("metrics")
            if (metrics != null) {
                val keys = metrics.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val value = metrics.getLong(key, 0L)
                    trace.putMetric(key, value)
                }
            }

            trace.stop()
            val ret = JSObject()
            ret.put("status", "stopped")
            ret.put("traceName", traceName)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop trace: ${e.message}")
        }
    }

    @PluginMethod
    fun recordNetworkMetric(call: PluginCall) {
        val url = call.getString("url")
        val httpMethod = call.getString("httpMethod", "GET")
        val responseCode = call.getInt("responseCode", 200) ?: 200
        val durationMs = call.getLong("durationMs", 0L) ?: 0L
        val responsePayloadBytes = call.getLong("responsePayloadBytes", 0L) ?: 0L

        if (url.isNullOrEmpty()) {
            call.reject("url is required")
            return
        }

        try {
            val metric: HttpMetric = FirebasePerformance.getInstance().newHttpMetric(url, httpMethod)
            metric.setHttpResponseCode(responseCode)
            metric.setResponsePayloadSize(responsePayloadBytes)
            metric.start()
            if (durationMs > 0) {
                Thread.sleep(0) // metric duration is tracked automatically between start and stop
            }
            metric.stop()

            val ret = JSObject()
            ret.put("status", "recorded")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to record network metric: ${e.message}")
        }
    }
}
