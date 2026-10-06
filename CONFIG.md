# Configuration

Every setting lives in `BepInEx\config\com.ivmakk.survivallog.bettertrade.cfg`, written the first time you run the game with the mod installed. Edit it with any text editor while the game is closed. Changes apply at the next game start.

## General

| Setting | Default | Values | What it does |
|---|---|---|---|
| `Verbose` | `false` | `true` / `false` | Enables extra diagnostic messages at Debug level for troubleshooting. Leave `false` in normal play. |

To record these messages in `BepInEx\LogOutput.log`, also include `Debug` in `LogLevels` under `[Logging.Disk]` in `BepInEx\config\BepInEx.cfg`.

## Features

| Setting | Default | Values | What it does |
|---|---|---|---|
| `TradeStorages` | `true` | `true` / `false` | Adds the Trading tag to storage settings and shows tagged home storage as tabs of the trade window in every mode. `false` disables both. Loading and saving with this disabled permanently removes existing Trading tags; setting it back to `true` does not restore them. Items and other tags are kept. |
| `DeliveryRequestList` | `true` | `true` / `false` | Shows request demand bars and delivered/required counts in the delivery request list of Deliver Request, plus item icons where a specific item can be identified. Hover over an item bar for its tooltip; click it for item details. `false` restores the game's demand display. Item cells still show their contribution numbers. |
| `DeliveryRequestRewards` | `true` | `true` / `false` | Shows reward items in advance for aid platform and radio aid delivery requests in the delivery request list. Set `false` to hide these previews. This changes only the preview, not the rewards you receive. Works whether `DeliveryRequestList` is `true` or `false`. |

The Trading tag does not change robot sorting: other tags work as usual. A storage with only Trading, or with no tags after Trading is removed, receives nothing from the robot. If "Allow Take" is on, the robot can take its items out. Turn "Allow Take" off to keep items there manually.
