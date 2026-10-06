using System.Collections.Generic;
using BetterTrade;
using SlShared.I18n;
using Xunit;

public class TradingTagLogicTests
{
    [Fact]
    public void RowValues_FollowTheSuppliesRow()
    {
        Assert.Equal(0, TradingTagLogic.Dim);
        Assert.Equal(520, TradingTagLogic.Order);
        Assert.Equal(4, TradingTagLogic.SortPriority);
        Assert.Equal("trade", TradingTagLogic.IconKey);
        Assert.Equal("#FBB034", TradingTagLogic.Color);
    }

    private static readonly I18nTexts Texts = I18nTexts.Load(typeof(TradingTagLogicTests).Assembly, "BetterTrade");

    [Fact]
    public void Words_English()
    {
        var w = TradingTagLogic.WordsFrom(Texts.For(1, null));
        Assert.Equal("Trading", w.Name);
        Assert.Equal("Items here show as a tab of the trade window. It does not change which items go here.", w.Desc);
    }

    [Fact]
    public void Words_Chinese()
    {
        var w = TradingTagLogic.WordsFrom(Texts.For(0, null));
        Assert.Equal("交易", w.Name);
        Assert.Equal("这里的物品在交易时作为一个页签接入，直接取用；不会改变哪些物品放进来。", w.Desc);
    }

    [Fact]
    public void Words_UnknownLanguage_IsEnglish()
    {
        Assert.Equal("Trading", TradingTagLogic.WordsFrom(Texts.For(7, null)).Name);
    }

    [Theory]
    [InlineData(new[] { 1901 }, true)]
    [InlineData(new[] { 1011, 1901 }, true)]
    [InlineData(new[] { 1900 }, false)]
    [InlineData(new[] { 1018 }, false)]
    [InlineData(new int[0], false)]
    public void LinksToTrading_OnlyTheTradingTag(int[] tagIds, bool expected)
    {
        Assert.Equal(expected, TradingTagLogic.LinksToTrading(tagIds));
    }

    [Fact]
    public void ExtraTabs_TaggedStoragesNotInTheGameList_InOwnerIdOrder()
    {
        var tabs = TradingTagLogic.ExtraTabs(
            new long[] { 10, 11 },
            new[] { new TradingTagLogic.Storage(30, 501), new TradingTagLogic.Storage(11, 401), new TradingTagLogic.Storage(20, 502) });
        Assert.Equal(2, tabs.Count);
        Assert.Equal(20, tabs[0].OwnerId);
        Assert.Equal(502, tabs[0].ConfigId);
        Assert.Equal(30, tabs[1].OwnerId);
        Assert.Equal(501, tabs[1].ConfigId);
    }

    [Fact]
    public void ExtraTabs_AFridgeAToolCabinetOrTheHubThatTheGameLists_GetsNoSecondTab()
    {
        Assert.Empty(TradingTagLogic.ExtraTabs(
            new long[] { 10, 11, 12 },
            new[] { new TradingTagLogic.Storage(12, 1), new TradingTagLogic.Storage(10, 2), new TradingTagLogic.Storage(11, 3) }));
    }

    [Fact]
    public void ExtraTabs_NoTaggedStorage_IsEmpty()
    {
        Assert.Empty(TradingTagLogic.ExtraTabs(new long[] { 10 }, new List<TradingTagLogic.Storage>()));
    }
}
