import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type RenewvanBusState } from '../types'
import { getEnv } from '../config/runtimeEnv'

// Client-side MQTT-over-WebSocket connection to the renewvan bus broker
// (Mosquitto's WS listener), per
// hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md -- no
// polling backend, not offline-first. This is the thin adapter half of the
// ticket's seam: it owns the live connection and is intentionally not
// unit-tested (see ticket + hub spec Testing Decisions); the presentational
// components it feeds are tested separately against fixed props.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface RenewvanBus {
  state: RenewvanBusState
  status: ConnectionStatus
}

const TOPIC_PATTERN = /^renewvan\/(tank|relay|battery)\/([^/]+)\/([^/]+)$/

function applyMessage(prev: RenewvanBusState, topic: string, payload: string): RenewvanBusState {
  const match = TOPIC_PATTERN.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match

  if (domain === 'tank') {
    const value = property === 'fluid_type' || property === 'status' ? payload : Number(payload)
    return {
      ...prev,
      tanks: { ...prev.tanks, [id]: { ...prev.tanks[id], [property]: value } as RenewvanBusState['tanks'][string] },
    }
  }
  if (domain === 'battery') {
    const value = property === 'charge_state' ? payload : Number(payload)
    return {
      ...prev,
      batteries: {
        ...prev.batteries,
        [id]: { ...prev.batteries[id], [property]: value } as RenewvanBusState['batteries'][string],
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
 * Subscribes to `renewvan/#` over MQTT-over-WebSocket and exposes the
 * accumulated retained state plus connection status. Env-configured via
 * `VITE_MQTT_WS_URL` (required), `VITE_MQTT_USERNAME`/`VITE_MQTT_PASSWORD`
 * (read-scoped credentials, optional while the broker allows anonymous
 * access) -- resolved at runtime first, build-time as fallback; see
 * `../config/runtimeEnv`.
 */
export function useRenewvanBus(): RenewvanBus {
  const [state, setState] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const clientRef = useRef<MqttClient | null>(null)

  useEffect(() => {
    const url = getEnv('VITE_MQTT_WS_URL')
    if (!url) {
      setStatus('disconnected')
      return
    }

    const client = mqtt.connect(url, {
      username: getEnv('VITE_MQTT_USERNAME'),
      password: getEnv('VITE_MQTT_PASSWORD'),
      reconnectPeriod: 2000,
    })
    clientRef.current = client

    client.on('connect', () => {
      setStatus('connected')
      client.subscribe('renewvan/#')
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
