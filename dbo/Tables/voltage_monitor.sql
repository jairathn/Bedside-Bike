CREATE TABLE [dbo].[voltage_monitor] (
    [Id]              INT            IDENTITY (1, 1) NOT NULL,
    [device_id]       CHAR (5)       NOT NULL,
    [timestamp]       DATETIME       NOT NULL,
    [battery_voltage] DECIMAL (3, 2) NOT NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

