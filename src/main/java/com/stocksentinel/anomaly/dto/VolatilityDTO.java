package com.stocksentinel.anomaly.dto;

public class VolatilityDTO {
    private String symbol;
    private String rating;
    private int totalAnomalies;
    private int highSeverityCount;
    private int recentCount;
    private double avgDeviation;

    public VolatilityDTO() {}

    public VolatilityDTO(String symbol, String rating, int totalAnomalies,
                         int highSeverityCount, int recentCount, double avgDeviation) {
        this.symbol = symbol;
        this.rating = rating;
        this.totalAnomalies = totalAnomalies;
        this.highSeverityCount = highSeverityCount;
        this.recentCount = recentCount;
        this.avgDeviation = Math.round(avgDeviation * 100.0) / 100.0;
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getRating() { return rating; }
    public void setRating(String rating) { this.rating = rating; }
    public int getTotalAnomalies() { return totalAnomalies; }
    public void setTotalAnomalies(int totalAnomalies) { this.totalAnomalies = totalAnomalies; }
    public int getHighSeverityCount() { return highSeverityCount; }
    public void setHighSeverityCount(int highSeverityCount) { this.highSeverityCount = highSeverityCount; }
    public int getRecentCount() { return recentCount; }
    public void setRecentCount(int recentCount) { this.recentCount = recentCount; }
    public double getAvgDeviation() { return avgDeviation; }
    public void setAvgDeviation(double avgDeviation) { this.avgDeviation = avgDeviation; }
}
