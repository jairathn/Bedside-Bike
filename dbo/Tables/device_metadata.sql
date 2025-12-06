CREATE TABLE [dbo].[device_metadata] (
    [id]              INT            IDENTITY (1, 1) NOT NULL,
    [device_mac]      CHAR (13)      NOT NULL,
    [timestamp]       DATETIME2 (3)  NOT NULL,
    [battery_voltage] DECIMAL (4, 3) NOT NULL,
    CONSTRAINT [PK_device_metadata] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

