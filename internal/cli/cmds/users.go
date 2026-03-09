package cmds

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/soumen-basu/stenella/internal/cli/client"
	"github.com/spf13/cobra"
)

var token string

func init() {
	usersCmd.PersistentFlags().StringVarP(&token, "token", "t", "", "Bearer token for authentication")
	usersCmd.MarkPersistentFlagRequired("token")
	rootCmd.AddCommand(usersCmd)

	usersCmd.AddCommand(meCmd)
}

var usersCmd = &cobra.Command{
	Use:   "users",
	Short: "Manage Stenella users",
	Long:  `Subcommands for interacting with the user management endpoints.`,
}

var meCmd = &cobra.Command{
	Use:   "me",
	Short: "Get current user profile",
	Run: func(cmd *cobra.Command, args []string) {
		c, err := client.NewClientWithResponses("http://localhost:8000")
		if err != nil {
			fmt.Println("Error creating client:", err)
			os.Exit(1)
		}

		ctx := context.Background()

		// Helper to configure the Authorization header
		addBearerToken := func(ctx context.Context, req *http.Request) error {
			req.Header.Add("Authorization", "Bearer "+token)
			return nil
		}

		parsedResp, err := c.ReadUserMeApiV1UsersMeGetWithResponse(ctx, addBearerToken)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			user := parsedResp.JSON200
			fmt.Printf("Logged in as User ID: %d\n", user.Id)
			fmt.Printf("Email: %s\n", user.Email)
			if user.Role != nil {
				fmt.Printf("Role: %s\n", *user.Role)
			}
			if user.IsActive != nil {
				fmt.Printf("Active: %v\n", *user.IsActive)
			}
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}
