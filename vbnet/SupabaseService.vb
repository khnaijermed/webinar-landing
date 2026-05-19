' =============================================================================
'  SupabaseService.vb
'  Singleton-style wrapper around Supabase.Client for VB.NET projects.
'
'  NuGet packages required:
'    Install-Package supabase
'    Install-Package supabase-csharp
'  (the metapackage "supabase" pulls in postgrest-csharp, gotrue-csharp,
'   storage-csharp, realtime-csharp, and functions-csharp.)
'
'  Usage:
'    Await SupabaseService.InitializeAsync()
'    Await SupabaseService.SignInAsync("admin@example.com", "secret")
'    Dim pages = Await SupabaseService.Client.From(Of Page)().Get()
' =============================================================================
Imports System
Imports System.Threading.Tasks
Imports Supabase

Public Module SupabaseService

    Private Const SupabaseUrl     As String = "https://izzxupiukzbmgmijqvru.supabase.co"
    Private Const SupabaseAnonKey As String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6enh1cGl1a3pibWdtaWpxdnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTUwNjgsImV4cCI6MjA5NDQzMTA2OH0.swTI1SVX0k9RnSG3ayeT083wH_ew8N9SrM5udMw2bD4"

    Private _client As Supabase.Client

    Public ReadOnly Property Client As Supabase.Client
        Get
            If _client Is Nothing Then
                Throw New InvalidOperationException(
                    "SupabaseService not initialized. Call InitializeAsync() first.")
            End If
            Return _client
        End Get
    End Property

    Public Async Function InitializeAsync() As Task
        Dim options As New SupabaseOptions With {
            .AutoConnectRealtime = False,
            .AutoRefreshToken    = True
        }
        _client = New Supabase.Client(SupabaseUrl, SupabaseAnonKey, options)
        Await _client.InitializeAsync()
    End Function

    ' ---------------------------------------------------------------------
    ' Auth helpers
    ' ---------------------------------------------------------------------
    Public Async Function SignInAsync(email As String, password As String) As Task(Of Boolean)
        Try
            Dim session = Await _client.Auth.SignIn(email, password)
            Return session IsNot Nothing
        Catch
            Return False
        End Try
    End Function

    Public Async Function SignOutAsync() As Task
        Await _client.Auth.SignOut()
    End Function

    Public ReadOnly Property IsSignedIn As Boolean
        Get
            Return _client IsNot Nothing AndAlso _client.Auth.CurrentSession IsNot Nothing
        End Get
    End Property

    ' ---------------------------------------------------------------------
    ' Storage helpers
    ' ---------------------------------------------------------------------
    '   imagesBucket size limit:  5 MB  — mime: image/jpeg, image/png, image/webp
    '   videosBucket size limit: 100 MB — mime: video/mp4, video/webm
    ' ---------------------------------------------------------------------
    Public Async Function UploadImageAsync(localPath As String, remoteName As String) As Task(Of String)
        Await _client.Storage.From("images").Upload(localPath, remoteName)
        Return _client.Storage.From("images").GetPublicUrl(remoteName)
    End Function

    Public Async Function UploadVideoAsync(localPath As String, remoteName As String) As Task(Of String)
        Await _client.Storage.From("videos").Upload(localPath, remoteName)
        Return _client.Storage.From("videos").GetPublicUrl(remoteName)
    End Function

End Module
