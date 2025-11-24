'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Save, X, Users, User } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Badge,
} from '@/components/ui';

const UserFormSchema = z.object({
  output_name: z.string().min(1, 'Display name is required').max(100, 'Name too long'),
  output_id: z.string().min(1, 'Employee ID is required').max(20, 'ID too long'),
});

type UserFormData = z.infer<typeof UserFormSchema>;

interface UserType {
  username: string;
  output_name: string;
  output_id: string;
}

interface UserManagementTabProps {
  onNotification: (type: 'success' | 'error', message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function UserManagementTab({
  onNotification,
  isLoading,
  setIsLoading,
}: UserManagementTabProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      output_name: '',
      output_id: '',
    },
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/v1/config/users');
      if (!response.ok) throw new Error('Failed to load users');

      const result = await response.json();
      if (result.success && result.data) {
        const userList = Object.entries(result.data.operators as Record<string, { output_name: string; output_id: string }>).map(([username, data]) => ({
          username,
          output_name: data.output_name,
          output_id: data.output_id,
        }));
        setUsers(userList);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      onNotification('error', 'Failed to load user configuration');
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);

    try {
      // Prepare updated users object
      let updatedUsers: Record<string, { output_name: string; output_id: string }>;

      if (editingUser) {
        // Update existing user
        updatedUsers = users.reduce((acc, user) => {
          if (user.username === editingUser.username) {
            acc[user.username] = data;
          } else {
            acc[user.username] = { output_name: user.output_name, output_id: user.output_id };
          }
          return acc;
        }, {} as Record<string, { output_name: string; output_id: string }>);
      } else {
        // Add new user - generate username from display name
        const username = data.output_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 30);

        updatedUsers = users.reduce((acc, user) => {
          acc[user.username] = { output_name: user.output_name, output_id: user.output_id };
          return acc;
        }, {
          [username]: data,
        } as Record<string, { output_name: string; output_id: string }>);
      }

      // Save to API
      const response = await fetch('/api/v1/config/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operators: updatedUsers }),
      });

      const result = await response.json();

      if (result.success) {
        onNotification('success', editingUser ? 'User updated successfully' : 'User added successfully');
        reset();
        setEditingUser(null);
        setIsAddingUser(false);
        await loadUsers();
      } else {
        onNotification('error', result.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      onNotification('error', 'Network error while saving user');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (username: string) => {
    if (username !== deleteConfirm) return;

    setIsLoading(true);

    try {
      const updatedUsers = users.reduce((acc, user) => {
        if (user.username !== username) {
          acc[user.username] = { output_name: user.output_name, output_id: user.output_id };
        }
        return acc;
      }, {} as Record<string, { output_name: string; output_id: string }>);

      const response = await fetch('/api/v1/config/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operators: updatedUsers }),
      });

      const result = await response.json();

      if (result.success) {
        onNotification('success', 'User deleted successfully');
        setDeleteConfirm(null);
        await loadUsers();
      } else {
        onNotification('error', result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      onNotification('error', 'Network error while deleting user');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setIsAddingUser(false);
    reset({
      output_name: user.output_name,
      output_id: user.output_id,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setIsAddingUser(false);
    reset();
  };

  const startAdd = () => {
    setEditingUser(null);
    setIsAddingUser(true);
    reset();
  };

  return (
    <div className="space-y-8">
      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6" />
                Current Users
              </CardTitle>
              <CardDescription>
                Manage system operators and their display information
              </CardDescription>
            </div>
            <Badge variant="default">{users.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users configured</p>
              <p className="text-sm">Click &quot;Add User&quot; to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.username}
                  className={`border rounded-lg p-4 transition-colors ${editingUser?.username === user.username
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{user.output_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          <span className="font-medium">Username:</span> {user.username}
                        </span>
                        <span>
                          <span className="font-medium">ID:</span> {user.output_id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingUser?.username === user.username ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(user)}
                            disabled={isLoading || isAddingUser}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="error"
                            size="sm"
                            onClick={() => setDeleteConfirm(user.username)}
                            disabled={isLoading || isAddingUser}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Form */}
      {(isAddingUser || editingUser) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {isAddingUser ? <Plus className="h-6 w-6" /> : <Edit2 className="h-6 w-6" />}
              {isAddingUser ? 'Add New User' : 'Edit User'}
            </CardTitle>
            <CardDescription>
              {isAddingUser
                ? 'Enter user information to create a new system operator'
                : 'Update user information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Display Name
                </label>
                <Input
                  {...register('output_name')}
                  placeholder="Enter full display name"
                  className="font-mono"
                  disabled={isLoading}
                />
                {errors.output_name && (
                  <p className="mt-2 text-sm text-destructive">{errors.output_name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Employee ID
                </label>
                <Input
                  {...register('output_id')}
                  placeholder="Enter employee ID (e.g., TPL0001)"
                  className="font-mono"
                  disabled={isLoading}
                />
                {errors.output_id && (
                  <p className="mt-2 text-sm text-destructive">{errors.output_id.message}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || !isDirty}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save User'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEdit}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add User Button */}
      {!isAddingUser && !editingUser && (
        <Button
          variant="primary"
          className="w-full"
          onClick={startAdd}
          disabled={isLoading}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New User
        </Button>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card className="max-w-md w-full border-destructive/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-destructive">Confirm Delete</CardTitle>
              <CardDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-bold text-foreground">
                {users.find(u => u.username === deleteConfirm)?.output_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Username: {deleteConfirm}
              </p>
              <div className="flex gap-4">
                <Button
                  variant="error"
                  className="flex-1"
                  onClick={() => deleteUser(deleteConfirm)}
                  disabled={isLoading}
                >
                  Yes, Delete User
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}