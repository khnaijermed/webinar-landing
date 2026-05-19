Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("webinar_days")>
Public Class WebinarDay
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("day_number")>
    Public Property DayNumber As Integer

    <Column("title")>
    Public Property Title As String

    <Column("description")>
    Public Property Description As String

    <Column("sort_order")>
    Public Property SortOrder As Integer

    <Column("is_active")>
    Public Property IsActive As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class
