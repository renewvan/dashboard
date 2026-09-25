import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyVanBusState, type VanBusState } from '../types'

// Client-side MQTT-over-WebSocket connection to the van bus broker
// (Mosquitto's WS listener), per
// hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md — no
// polling backend, not offline-first. This is the thin adapter half of the
// ticket's seam: it owns the live connection and is intentionally not
// unit-tested (see ticket + hub spec Testing Decisions); the presentational
// components it feeds are tested separately against fixed props.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface VanBus {
  state: VanBusState
  status: ConnectionStatus
}

const TOPIC_PATTERN = /^van\/(tank|relay|battery)\/([^/]+)\/([^/]+)$/

function applyMessage(prev: VanBusState, topic: string, payload: string): VanBusState {
  const match = TOPIC_PATTERN.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match

  if (domain === 'tank') {
    const value = property === 'fluid_type' || property === 'status' ? payload : Number(payload)
    return {
      ...prev,
      tanks: { ...prev.tanks, [id]: { ...prev.tanks[id], [property]: value } as VanBusState['tanks'][string] },
    }
  }
  if (domain === 'battery') {
    const value = property === 'charge_state' ? payload : Number(payload)
    return {
      ...prev,
      batteries: {
        ...prev.batteries,
        [id]: { ...prev.batteries[id], [property]: value } as VanBusState['batteries'][string],
      },
    }
  }
  // relay: only `state`, published as normalized "true"/"false" strings.
  return {
    ...prev,
    relays: { ...prev.relays, [id]: { state: payload === 'true' } },
  }
}

/**
 * Subscribes to `van/#` over MQTT-over-WebSocket and exposes the
 * accumulated retained state plus connection status. Env-configured via
 * `VITE_MQTT_WS_URL` (required), `VITE_MQTT_USERNAME`/`VITE_MQTT_PASSWORD`
 * (read-scoped credentials, optional while the broker allows anonymous
 * access).
 */
export function useVanBus(): VanBus {
  const [state, setState] = useState<VanBusState>(emptyVanBusState)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const clientRef = useRef<MqttClient | null>(null)

  useEffect(() => {
    const url = import.meta.env.VITE_MQTT_WS_URL as string | undefined
    if (!url) {
      setStatus('disconnected')
      return
    }

    const client = mqtt.connect(url, {
      username: import.meta.env.VITE_MQTT_USERNAME as string | undefined,
      password: import.meta.env.VITE_MQTT_PASSWORD as string | undefined,
      reconnectPeriod: 2000,
    })
    clientRef.current = client

    client.on('connect', () => {
      setStatus('connected')
      client.subscribe('van/#')
    })
    client.on('reconnect', () => setStatus('connecting'))
    client.on('close', () => setStatus('disconnected'))
    client.on('offline', () => setStatus('disconnected'))
    client.on('error', () => setStatus('disconnected'))
    client.on('message', (topic, message) => {
      setState((prev) => applyMessage(prev, topic, message.toString()))
    })

    return () => {
      client.end(true)
      clientRef.current = null
    }
  }, [])

  return { state, status }
}
