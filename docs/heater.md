# Heater page

The Heater page controls the cabin heater (an Autoterm AIR 2D, read and written over UART by
`renewvan/driver-autoterm`). The dashboard only talks to the hub's `renewvan/heater/<id>/*` topics; the
contract and the command safety rules are hub ADR 0021 and `hub/schema/heater.schema.json`.

It is laid out for the 800×480 kiosk with the bottom bar pinned or hidden, and reflows on a phone:

- **Left card:** the dial (target temperature, or power level), the −/+ buttons and the mode buttons.
- **Right card:** the heater's name and phase, the readings, the sensor dropdown, the running clock and
  Start/Stop.

## Start-page widget

The phone Start page (and the Grid view) has a **Heater** widget: the first heater as one card, headed by its
name and status (the only header it uses), with a carousel under it: slide 1 is the dial, the mode buttons and
Start/Stop, slide 2 the readings, sensor and timer. It shares the page's commands, modes and failure toasts.
The Grid draws it 2 columns by 3 rows. Like any new widget it is in the default layout only: a layout saved
earlier needs Heater added in Settings → General → Widgets.

## Operating modes

The mode buttons follow the Autoterm Comfort Control panel
([manual, English](https://cdn.autoterm.com/Manuals/Control%20panels/Comfort%20Control%20V1/Comfort%20Control%20EN%20v06.2021-v1.20%20A4.pdf))
and Venus OS's `dbus-autoterm`:

| Button             | On a real heater | Notes                                                                        |
| ------------------ | ---------------- | ---------------------------------------------------------------------------- |
| Power              | works            | Hub `mode` `power`. The dial sets the power level, 1-9.                      |
| Temperature        | works            | Hub `mode` `heater_temperature` or `external_temperature`; the dial sets °C. |
| Thermostat         | disabled         | No hub field. Venus's `wait_mode` byte is the candidate, unverified.         |
| Heat + ventilation | disabled         | No hub field.                                                                |
| Ventilation        | enabled          | Publishes `ventilating/set` (an action, not a `mode`), after a confirmation. The `0x23` frame is not yet bench-verified on a real heater. |

The hub's `mode` only carries Power and the two Temperature sensors, so Temperature resumes the sensor
last in use. A heater that reports `ventilating` shows Ventilation selected, and its dial shows the power
level (ventilation is set by a level and a duration, not a temperature).

### Rules from the manual

- **Ventilation and the heating modes exclude each other while the heater runs** (§3.3, §3.4: "It is
  impossible to switch to ventilation mode while heater is operating in one of the heating modes", and the
  reverse). Tapping the other family while the heater is on opens a "Stop the heater first?" prompt, as Venus
  does; **Stop heater** sends the stop and the page switches once the heater reports Off. Cancel sends
  nothing. Switching between heating modes while running asks nothing.
- **The sensor cannot be changed in Power or Thermostat mode** (§4.3), and Ventilation reads none, so the
  sensor dropdown is disabled in all three.
- **Settings are refused while the heater shuts down** (hub ADR 0021): the mode buttons, dial and dropdown
  are disabled then.

### Not enforced

- Ventilation is unsupported on AIR 8D and FLOW heaters (§3.4); the hub does not say which model is attached.
- Venus hides Temperature and Heat + ventilation without a room sensor; here the heater's own sensor always
  counts as one.
- The ventilation run time (30 min to infinite) and the Thermostat rise/fall limits have no hub field.
- The setpoint range is 1-30 °C (hub schema); the manual allows 0-30 °C.
- The power dial is 1-9 as in Venus; the hub accepts 0-9.

## Commands and failures

A command is confirmed only when the retained field changes; the Driver never replies (hub ADR 0021). After
`GIVE_UP_MS` (6 s) with no change the page raises a danger toast ("Target didn't change", "Power didn't
change", "Mode didn't change", "Heater didn't respond") and the control returns to what the heater reports. A
command the heater did answer is never reported, and Start/Stop are usable again after a failure.

## Running clock

The Runtime readout beside the sensor dropdown works as on Venus OS: it shows 0:00 until the heater leaves
Off (the Start button), counts every second, takes the heater's own `runtime_s` whenever it arrives, and
returns to 0:00 when the heater is off. It shows `—` while the heater is not reporting.

## Colour

The dial and the selected mode button are warm while the heater is starting, warming up or running, and
blue otherwise, and always blue in Ventilation (the fan runs and nothing burns).

## Trying it without a heater

Dev builds only (a kiosk ignores every flag). Add the flags to the URL; `page=heater` opens the page:

```
http://localhost:5173/?flag.heater-dev=1&flag.navbar-position=bottom&flag.nav-pinned=1&page=heater
```

| Flag                       | Effect                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `flag.heater-dev=1`        | The page uses a local heater: no hub, driver or Demo mode needed, nothing is published.      |
| `flag.nav-pinned=1`        | Pins the kiosk's bottom bar open (it resets on reload; also a switch in Settings → General). |
| `flag.navbar-position=...` | A stored setting, written to localStorage once (`bottom` for the kiosk layout).              |

The local heater starts off with commands on. Start walks through Starting, Warming up and Running; Stop
through Shutting down and Off; each command is answered after 0.5 s. Every mode button works, because the
page holds the modes the hub cannot carry. It cannot show a fault, a heater that reports ventilating, or a
failed command, so those are covered by `HeaterPage.test.tsx`.

With Demo mode on and no `heater-dev`, the page shows the hub's demo heater read-only (hub ADR 0021), so
every control is disabled.

## Still to do

Thermostat, Heat + ventilation and Ventilation need an operating-mode field in the hub schema and the same
commands in `driver-autoterm`, then a bench check on the heater (the ventilation frame, `wait_mode`, and what
`runtime_s` reports at start and shutdown) before the buttons are enabled.
