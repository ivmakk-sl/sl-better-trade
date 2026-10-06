using System.Collections.Generic;

namespace BetterTrade
{
    // The delivery request reward of a row of the delivery request list: which rows have a reward that the
    // mod can read, and the reward items. No game or BepInEx type here.
    public static class RewardData
    {
        public enum Source
        {
            None,
            // AidPlatformManager.BuildCommissionReward(Key): the AidCommission row of the commission number.
            AidPlatform,
            // StrangerSupportManager.GetDefRsGift(AidChannelDefRs(Key)): the reward set of the aid channel number.
            AidChannel,
        }

        public struct Lookup
        {
            public Source Source;
            public int Key;
        }

        public sealed class Item
        {
            public int Id;
            public int Count;
        }

        // A row of the aid platform reads the commission number no; a row of the aid channel reads its channel number.
        // Each other row has no reward that the mod can read in advance.
        public static Lookup SourceOf(int kind, int id, int no)
        {
            var row = RequestData.SourceOf(kind, id);
            if (row == RequestData.RowSource.AidPlatform && no > 0) return new Lookup { Source = Source.AidPlatform, Key = no };
            if (row == RequestData.RowSource.AidChannel) return new Lookup { Source = Source.AidChannel, Key = RequestData.ChannelOf(id) };
            return new Lookup { Source = Source.None };
        }

        // The reward items in the game's order, with no entry of no item or no count.
        public static List<Item> Items(IEnumerable<KeyValuePair<int, int>> reward)
        {
            var result = new List<Item>();
            foreach (var r in reward)
                if (r.Key > 0 && r.Value > 0) result.Add(new Item { Id = r.Key, Count = r.Value });
            return result;
        }
    }
}
