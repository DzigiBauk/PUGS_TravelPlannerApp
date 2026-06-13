using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelPlanService.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityLocationData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Activities",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Activities",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VisitOrder",
                table: "Activities",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "VisitOrder",
                table: "Activities");
        }
    }
}
