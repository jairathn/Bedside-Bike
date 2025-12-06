CREATE TABLE [dbo].[pedaling_data] (
    [Id]               INT            IDENTITY (1, 1) NOT NULL,
    [device_id]        CHAR (10)      NOT NULL,
    [timestamp]        DATETIME       NOT NULL,
    [resistance_level] TINYINT        NOT NULL,
    [flywheel_rpm]     SMALLINT       NOT NULL,
    [battery_voltage]  DECIMAL (3, 2) NOT NULL,
    CONSTRAINT [PK_pedaling_data] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

