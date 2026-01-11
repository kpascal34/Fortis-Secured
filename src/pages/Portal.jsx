import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginForm from "../components/LoginForm";

const Portal = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky text-white">
        <p className="text-sm text-white/70">Loading portal…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-24 text-white">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-1/3 top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-10 bottom-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mt-10 text-4xl font-bold">Fortis Secured Portal</h1>
          <p className="mt-4 text-white/70">
            Access incident management, guard operations, asset tracking and realtime reporting tailored to your role.
          </p>
        </div>
        <div className="mt-16">
          <LoginForm />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default Portal;
