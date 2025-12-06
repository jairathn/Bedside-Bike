-- Create the stored procedure in the specified schema
CREATE PROCEDURE [dbo].[Insert_Voltage_Monitor]
    @device_id CHAR(5), 
    @timestamp DATETIME = NULL,
    @battery_voltage DECIMAL(3,2) = -1.0,
    @r varchar(10) = NULL out 
-- add more stored procedure parameters here
AS
BEGIN TRY
   INSERT INTO  [dbo].[voltage_monitor] ([device_id] ,[timestamp] ,[battery_voltage])
    VALUES (@device_id, @timestamp, @battery_voltage)

    SELECT @r = 'SUCCESS'
END TRY

BEGIN CATCH
    SELECT @r = 'ERROR: ' + ERROR_MESSAGE()
END CATCH

GO

