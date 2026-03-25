package cmds

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/soumen-basu/PayMeBack/internal/cli/client"
	"github.com/spf13/cobra"
)

func init() {
	rootCmd.AddCommand(adminCmd)
	adminCmd.AddCommand(adminUsersCmd)
	adminUsersCmd.AddCommand(adminUsersActiveCmd)
	adminUsersCmd.AddCommand(adminUsersViewCmd)
	adminUsersCmd.AddCommand(adminUsersDeactivateCmd)
}

var adminCmd = &cobra.Command{
	Use:   "admin",
	Short: "Admin operations for PayMeBack API",
}

var adminUsersCmd = &cobra.Command{
	Use:   "users",
	Short: "Admin user management",
}

func addBearerTokenEditor(ctx context.Context, req *http.Request) error {
	token := getEffectiveToken()
	req.Header.Add("Authorization", "Bearer "+token)
	return nil
}

func getAdminClient() *client.ClientWithResponses {
	c, err := client.NewClientWithResponses("http://localhost:8000")
	if err != nil {
		fmt.Println("Error creating client:", err)
		os.Exit(1)
	}
	return c
}

var adminUsersActiveCmd = &cobra.Command{
	Use:   "active",
	Short: "List all active users",
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()

		parsedResp, err := c.ReadActiveUsersApiV1AdminUsersActiveGetWithResponse(ctx, &client.ReadActiveUsersApiV1AdminUsersActiveGetParams{}, addBearerTokenEditor)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			users := *parsedResp.JSON200
			fmt.Printf("Found %d active users:\n", len(users))
			for _, user := range users {
				role := "N/A"
				if user.Role != nil {
					role = *user.Role
				}
				sessionCount := 0
				if user.SessionCount != nil {
					sessionCount = *user.SessionCount
				}
				fmt.Printf("- ID: %d | Email: %s | Role: %s | Sessions: %d\n", user.Id, user.Email, role, sessionCount)
			}
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}

var adminUsersViewCmd = &cobra.Command{
	Use:   "view [email_or_id]",
	Short: "View specific user details by ID or Email",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()
		userIdent := args[0]

		parsedResp, err := c.ReadUserApiV1AdminUsersUserIdentGetWithResponse(ctx, userIdent, addBearerTokenEditor)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			user := parsedResp.JSON200
			fmt.Printf("User Details for %s:\n", userIdent)
			fmt.Printf("  ID: %d\n", user.Id)
			fmt.Printf("  Email: %s\n", user.Email)
			if user.Role != nil {
				fmt.Printf("  Role: %s\n", *user.Role)
			}
			if user.IsActive != nil {
				fmt.Printf("  Active: %v\n", *user.IsActive)
			}
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}

var adminUsersDeactivateCmd = &cobra.Command{
	Use:   "deactivate [user_id]",
	Short: "Deactivate a user by ID",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()

		userId, err := strconv.Atoi(args[0])
		if err != nil {
			fmt.Println("Invalid user ID. Must be an integer.")
			os.Exit(1)
		}

		parsedResp, err := c.DeleteUserApiV1AdminUsersUserIdDeleteWithResponse(ctx, userId, addBearerTokenEditor)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.StatusCode() == 200 {
			fmt.Printf("User ID %d deactivated successfully.\n", userId)
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}
