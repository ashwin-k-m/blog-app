import './App.css'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import IndexPage from './pages/Indexpage'
import LoginPage from './pages/Loginpage'
import RegisterPage from './pages/Registerpage'
import CreatePost from './pages/Createpage'
import PostPage from './pages/Postpage'
import EditPost from './pages/Editpage'
import { UserContextProvider } from './components/Usercontext'
import React from 'react'

function App() {

  return (
    <UserContextProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/edit/:id" element={<EditPost />} />
        </Route>
      </Routes>
    </UserContextProvider>
  )
}

export default App
