Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("leads")>
Public Class Lead
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("full_name")>
    Public Property FullName As String

    <Column("email")>
    Public Property Email As String

    <Column("phone")>
    Public Property Phone As String

    <Column("source")>
    Public Property Source As String

    <Column("created_at")>
    Public Property CreatedAt As DateTime
End Class
