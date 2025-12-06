CREATE TABLE [dbo].[device_data] (
    [id]         INT           IDENTITY (1, 1) NOT NULL,
    [device_mac] CHAR (13)     NOT NULL,
    [timestamp]  DATETIME2 (3) NOT NULL,
    [resistance] TINYINT       NOT NULL,
    [legs_rpm]   SMALLINT      NOT NULL,
    [arms_rpm]   SMALLINT      NOT NULL,
    CONSTRAINT [PK_device_data] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

