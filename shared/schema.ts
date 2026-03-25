import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Candle data stored for TQQQ 5-min chart
export const candles = sqliteTable("candles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  time: integer("time").notNull(), // unix timestamp
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: integer("volume").notNull(),
});

export const insertCandleSchema = createInsertSchema(candles).omit({ id: true });
export type InsertCandle = z.infer<typeof insertCandleSchema>;
export type Candle = typeof candles.$inferSelect;

// Trade log
export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryTime: integer("entry_time").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitTime: integer("exit_time"),
  exitPrice: real("exit_price"),
  shares: integer("shares").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  status: text("status").notNull(), // 'open' | 'closed_tp' | 'closed_sl' | 'closed_manual'
  pnl: real("pnl"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Indicator snapshot (latest values)
export interface IndicatorSnapshot {
  ema9: number;
  ema21: number;
  emaAligned: boolean;
  rsi: number;
  rsiInRange: boolean;
  vwap: number;
  vwapSlope: number;
  vwapBullish: boolean;
  priceAboveVwap: boolean;
  currentVolume: number;
  avgVolume20: number;
  volumeSufficient: boolean;
  orbHigh: number;
  orbBreakout: boolean;
  currentPrice: number;
  allConditionsMet: boolean;
}

export interface PositionInfo {
  isOpen: boolean;
  entryPrice: number;
  shares: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnl: number;
  currentPrice: number;
}
