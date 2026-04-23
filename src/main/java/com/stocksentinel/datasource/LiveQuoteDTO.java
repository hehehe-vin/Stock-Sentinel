package com.stocksentinel.datasource;

public class LiveQuoteDTO {
    private String symbol;
    private double price;
    private double change;
    private double changePercent;
    private double high;
    private double low;
    private double open;
    private double previousClose;

    public LiveQuoteDTO() {}

    public LiveQuoteDTO(String symbol, double price, double change, double changePercent,
                        double high, double low, double open, double previousClose) {
        this.symbol = symbol;
        this.price = price;
        this.change = change;
        this.changePercent = changePercent;
        this.high = high;
        this.low = low;
        this.open = open;
        this.previousClose = previousClose;
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public double getChange() { return change; }
    public void setChange(double change) { this.change = change; }
    public double getChangePercent() { return changePercent; }
    public void setChangePercent(double changePercent) { this.changePercent = changePercent; }
    public double getHigh() { return high; }
    public void setHigh(double high) { this.high = high; }
    public double getLow() { return low; }
    public void setLow(double low) { this.low = low; }
    public double getOpen() { return open; }
    public void setOpen(double open) { this.open = open; }
    public double getPreviousClose() { return previousClose; }
    public void setPreviousClose(double previousClose) { this.previousClose = previousClose; }
}
