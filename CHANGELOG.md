# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- A dimmed cell of the storage grid or the drone in the trade window no longer shows the grid lines through it when its item takes more than one cell (without Compact Inventory).

## [1.0.1] - 2026-10-08

### Fixed

- A second save load in one game run, for example after a return to the title screen, no longer writes an error about the icon of the Trading tag to the game's log.

## [1.0.0] - 2026-10-06

### Added

- In a trade (Trade Run, Respond to Request), each cell of the storage grid and of the drone shows the trade value of the whole stack for this trader: gold for full value, coral for less than full value, green for wanted.
- The header of a trade shows the factors of the trader in place of the game's "Wants" line: "Wants:" with each wanted category and its factor, and "Half value:" with the half value category.
- Each row of the Offered panel shows the trade value of one unit on its icon. A click on the icon opens the item detail popup.
- The offer at the left end of the bottom bar and the goods at the right end. A hover on the bar shows the words and the deal line.
- In Deliver Supplies, each cell shows what the stack adds to the supply, of its supply kind. For a neighbor, the medicine total of the drone.
- In the donation (Aid the Warehouse Keeper, the Trapped Veteran), each cell shows the satiety of the stack.
- In Deliver Request, each cell shows what the stack adds to the selected delivery request, from the game's own check with the drone cargo counted, for each kind of delivery request.
- A cell that adds nothing in these modes is dimmed.
- In the delivery request list, each request demand shows as one bar with its progress, the drone cargo, its label, and its count, and the list has no sideways scrollbar. A request demand for one item shows the item icon, its tooltip on a hover, and the item detail popup on a click.
- In the delivery request list, the rewards of each delivery request of the aid platform and of the radio aid, with the item tooltip on a hover and the item detail popup on a click.
- A Sort dropdown below the storage grid of the trade window: the value view shows the items of the open tab with the highest number first, without a change of the places of the items. The choice stays until the game quits.
- More lines in the item tooltips of the trade window: the subcategory, the uses, the food stats of one use, the effect of a book, the crop of a seed, and how the number is made.
- The Trading tag in the Supplies row of the tag rule, with a coin icon in the tag rule and in the head bar. Each storage of the home with the Trading tag shows as a tab of the trade window in each mode. The tag does not change what the robot puts into a storage.
- The config entries `TradeStorages`, `DeliveryRequestList`, and `DeliveryRequestRewards` in the `Features` section, each `true` by default.
- English and Chinese texts, which follow the display language of the game.
