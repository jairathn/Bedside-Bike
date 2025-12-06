CREATE TABLE [dbo].[user_tracking] (
    [id]            INT           IDENTITY (1, 1) NOT NULL,
    [device_mac]    CHAR (13)     NOT NULL,
    [time_start]    DATETIME2 (3) NOT NULL,
    [time_end]      DATETIME2 (3) NULL,
    [firstname]     NVARCHAR (50) NULL,
    [lastname]      NVARCHAR (50) NULL,
    [date_of_birth] DATE          NULL,
    [ppid]          VARCHAR (30)  NULL,
    CONSTRAINT [PK_user_tracking] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

