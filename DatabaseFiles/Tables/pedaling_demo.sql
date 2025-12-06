CREATE TABLE [dbo].[pedaling_demo] (
    [device_id]        CHAR (10)      NOT NULL,
    [timestamp]        DATETIME       NOT NULL,
    [resistance_level] TINYINT        NOT NULL,
    [flywheel_rpm]     SMALLINT       NOT NULL,
    [battery_voltage]  DECIMAL (3, 2) NOT NULL
);


GO

