# Better Trade

Better Trade shows the numbers that the trade window of *Survival Log* hides: what each item is worth to the trader, your offer and the goods at the bar, and what each item adds when you deliver supplies, donate, or fill a delivery request.

The game already counts these numbers to decide a deal, but it shows only icons and a bar. With Better Trade you can pick what to give without guessing. Supports English and Chinese.

## Features

### Trade (Trade Run, Respond to Request)

- Each cell of your storage and of the drone shows the trade value of the whole stack for this trader. Gold is full value, coral is less than full value (half value, or the sell rate of a robot module), green is wanted.
- The header shows the factors of the trader in place of the game's "Wants" line, for example "Wants: Medicine ×1.6" and "Half value: Food ×½".
- Each row of the Offered panel shows the trade value of one unit on its icon. A click on the icon opens the item details.
- Your offer shows at the left end of the bottom bar and the goods at the right end. A hover on the bar shows the words and the deal line.

### Deliver Supplies, donation, Deliver Request

- Deliver Supplies: each cell shows what the stack adds to the supply (satiety, seed, material, medicine, or fuel). For a neighbor, the mod also shows the medicine total of the drone, which the game does not show.
- Donation (Aid the Warehouse Keeper, the Trapped Veteran): each cell shows the satiety of the stack.
- Deliver Request: each cell shows what the stack adds to the selected delivery request if you put it into the drone now, with the drone cargo counted ("+3"). The number comes from the game's own check, so it covers each kind of delivery request, also the Research Station sample request.
- In all three modes, a cell that adds nothing is dimmed.

### Delivery request list

- Each request demand shows as one bar: the delivered part, a lighter part for the drone cargo, the label, and the count ("1/3"). A long label is cut with "...", and a hover shows the full label. The list has no sideways scrollbar.
- A request demand for one item shows the item icon. A hover shows the item tooltip, and a click opens the item details without a change of the selected delivery request.
- Each delivery request of the aid platform and of the radio aid shows its rewards under its bars. A hover on a reward shows its tooltip, and a click opens its details. A long reward shows 3 lines and a "+N" tile that opens the full list.

### Value view and tooltips

- A Sort dropdown below the storage grid shows the items of the open tab with the highest number first: "Trade value", "Supply", "Satiety", or "Request", after the mode. Same items stand together, and the stack that spoils first comes first. It changes only what the window shows, never where the items are. The choice stays until you quit the game.
- The item tooltips in the trade window get more lines: the subcategory, the uses, the food stats of one use, the effect of a book, the crop of a seed, and how the number is made (for example "84 = 28 x 6 uses x ½").

### Trading tag

- The tag rule of a storage ("What goes in here") gets the tag Trading in the Supplies row, after Misc, with a coin icon. The head bar above the storage shows the coin too.
- Each storage of your home with the Trading tag shows as a tab of the trade window, after the game's tabs, in each mode. Move items between it and the drone as with a tab of the game. A fridge, a tool cabinet, or the docked drone hub with the tag keeps its one tab.
- The tag does not change what the robot puts in: with other tags, the storage works as with those tags alone. With only the Trading tag, the robot puts nothing in it.
- With only the Trading tag and the robot's "Allow Take" on, the robot takes the items out, as from a storage with no tag. Turn "Allow Take" off on a storage with only the Trading tag.

The mod does not change a trade: the values, the deal line, the deal, and the items that the drone takes stay the same as without the mod. The save keeps only the Trading tag of each storage (see [Uninstall](#uninstall)).

Nexus page: https://www.nexusmods.com/survivallog/mods/26

## Compatibility

- [Project Cook](https://www.nexusmods.com/survivallog/mods/13) 1.3.0 or later: the cooking tag and the Trading tag work together on one storage, each with its own icon.
- [Item Totals](https://www.nexusmods.com/survivallog/mods/24): its `Total: N` line shows under the lines of Better Trade in the tooltip.

## Requirements

- Survival Log 1.1.18293 or later.
- The [BepInEx Pack for Survival Log](https://www.nexusmods.com/survivallog/mods/12), the BepInEx 6 (IL2CPP) build for the game.

## Install

1. Install the [BepInEx Pack for Survival Log](https://www.nexusmods.com/survivallog/mods/12) (if no other mods were installed before, start the game once so BepInEx finishes setup, then quit).
2. Extract this mod's zip into the game folder (the folder with the game .exe). The DLL lands in `BepInEx\plugins`. Full path example:
   - Steam: `C:\Program Files (x86)\Steam\steamapps\common\Survival Log\BepInEx\plugins\BetterTrade.dll`

## Uninstall

Delete `BetterTrade.dll` from the `BepInEx\plugins` folder.

The game then drops the Trading tag from each storage, and keeps the items and the other tags. A storage with only the Trading tag has an empty rule, and the robot still puts nothing in it until you set a tag of the game.

## Configuration

To change mod settings, edit `BepInEx\config\com.ivmakk.survivallog.bettertrade.cfg` while the game is closed (see [CONFIG.md](CONFIG.md) for every setting). Changes apply at the next game start.

## Troubleshooting

Tested on Survival Log 1.1.18293 (Steam build `25680222`) with BepInEx `6.0.0-be.788`.

If a game update removes a part of the trade window that the mod needs, that part shows as without the mod, and the other parts keep working. If the request demand bars look wrong after a game update, set `DeliveryRequestList` to `false` to get the game's list back.

If a number is missing, check `BepInEx\LogOutput.log` for `Better Trade loaded.` and any warnings or errors.

## Build

This is a BepInEx 6 IL2CPP plugin. It compiles against the game's IL2CPP interop assemblies, so a game install with BepInEx set up and started once is required. Those assemblies are game-derived and are not part of this repo. The .NET 8 SDK is required.

The build also builds the page script (TypeScript and CSS in `src/Web/`) with Vite, so Node is required too. The mod root has a `mise.toml` for Node, and the npm packages install once after a clone:

```
mise trust
npm ci
dotnet build src/BetterTrade.csproj -c Release
```

`Directory.Build.props` sets `GameDir` to the default Steam install path. If the game is in another place, override it without an edit of the file: set a `GameDir` environment variable, or pass `-p:GameDir=...` on the build. The output DLL is at `src\bin\Release\BetterTrade.dll`.

The C# unit tests do not need the game:

```
dotnet test tests/BetterTrade.Tests
```

Page tests use the game's own trade window page (Vitest with jsdom). Set `SL_GAME_DIR` for a non-default game install. Run these checks from the mod root:

```
npm test            # builds the page script, then runs the page tests
npm run lint        # stylelint on the CSS files
npm run typecheck   # TypeScript check of the page script and its tests
```

## Package

Add `-p:Package=true` to a Release build to also write the ready-to-install zip at `dist\BetterTrade-<version>.zip`, laid out as `BepInEx\plugins\BetterTrade.dll` so a user extracts it at the game root. A plain build skips this step.

```
dotnet build src/BetterTrade.csproj -c Release -p:Package=true
```

## License

Licensed under the GNU General Public License v3.0. Copyright (C) 2026 ivmakk. See [LICENSE](LICENSE).

You may reuse and modify this mod, but you must keep it open under the same license and give credit. Do not reupload it without credit.
