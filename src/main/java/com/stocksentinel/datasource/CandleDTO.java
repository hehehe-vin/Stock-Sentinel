package com.stocksentinel.datasource;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class CandleDTO {
    private String symbol;
    private long timestamp;
    private String time;
    private double open;
    private double high;
    private double low;
    private double close;
    private long volume;

    public CandleDTO() {}

    public CandleDTO(String symbol, long timestamp, double open, double high, double low, double close, long volume) {
        this.symbol = symbol;
        this.timestamp = timestamp;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.time = Instant.ofEpochSecond(timestamp)
                .atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("h:mm a"));
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public double getOpen() { return open; }
    public void setOpen(double open) { this.open = open; }
    public double getHigh() { return high; }
    public void setHigh(double high) { this.high = high; }
    public double getLow() { return low; }
    public void setLow(double low) { this.low = low; }
    public double getClose() { return close; }
    public void setClose(double close) { this.close = close; }
    public long getVolume() { return volume; }
    public void setVolume(long volume) { this.volume = volume; }
}
