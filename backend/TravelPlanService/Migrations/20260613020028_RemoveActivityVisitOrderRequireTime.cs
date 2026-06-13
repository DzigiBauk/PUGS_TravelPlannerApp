using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelPlanService.Migrations
{
    /// <inheritdoc />
    public partial class RemoveActivityVisitOrderRequireTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VisitOrder",
                table: "Activities");

            migrationBuilder.Sql(
                "UPDATE [Activities] SET [Time] = '00:00:00' WHERE [Time] IS NULL;");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "Time",
                table: "Activities",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0),
                oldClrType: typeof(TimeSpan),
                oldType: "time",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<TimeSpan>(
                name: "Time",
                table: "Activities",
                type: "time",
                nullable: true,
                oldClrType: typeof(TimeSpan),
                oldType: "time");

            migrationBuilder.AddColumn<int>(
                name: "VisitOrder",
                table: "Activities",
                type: "int",
                nullable: true);
        }
    }
}
