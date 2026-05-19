Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("stats")>
Public Class Stat
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    ' Stored as text because values like "100", "10", "AI" mix numbers and letters
    <Column("number")>
    Public Property Number As String

    <Column("label")>
    Public Property Label As String

    <Column("sort_order")>
    Public Property SortOrder As Integer

    <Column("is_active")>
    Public Property IsActive As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class
