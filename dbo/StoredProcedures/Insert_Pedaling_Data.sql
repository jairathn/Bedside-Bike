-- Create the stored procedure in the specified schema
CREATE PROCEDURE dbo.Insert_Pedaling_Data
    @device_id char(10), 
    @timestamp DATETIME,
    @resistance_level TINYINT, 
    @flywheel_rpm SMALLINT,
    @battery_voltage DECIMAL(3,2),
    @r varchar(10) = NULL out
AS
BEGIN TRY
   INSERT INTO  [dbo].[pedaling_data] ([device_id], [timestamp], [resistance_level], [flywheel_rpm], [battery_voltage])
    VALUES (@device_id, @timestamp, @resistance_level, @flywheel_rpm,  @battery_voltage)

    SELECT @r = 'SUCCESS'
END TRY

BEGIN CATCH
    SELECT @r = 'ERROR: ' + ERROR_MESSAGE()
END CATCH

GO

