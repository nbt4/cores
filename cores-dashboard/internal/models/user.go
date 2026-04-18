package models

import "time"

// User mirrors the shared users table in PostgreSQL.
// Both RentalCore and WarehouseCore use the same table.
type User struct {
	UserID        uint      `gorm:"column:userID;primaryKey"`
	Username      string    `gorm:"column:username"`
	PasswordHash  string    `gorm:"column:password_hash"`
	Email         string    `gorm:"column:email"`
	IsActive      bool      `gorm:"column:is_active"`
	ForcePassword bool      `gorm:"column:force_password_change"`
	CreatedAt     time.Time `gorm:"column:created_at"`
}

func (User) TableName() string { return "users" }

type Role struct {
	RoleID uint   `gorm:"column:role_id;primaryKey"`
	Name   string `gorm:"column:name"`
}

func (Role) TableName() string { return "roles" }
