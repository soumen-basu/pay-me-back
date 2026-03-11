package cmds

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func init() {
	metricsCmd.PersistentFlags().StringVarP(&adminToken, "token", "t", "", "Bearer token for authentication (admin only)")
	metricsCmd.MarkPersistentFlagRequired("token")
	rootCmd.AddCommand(metricsCmd)

	metricsCmd.AddCommand(dauCmd)
	metricsCmd.AddCommand(mauCmd)
	metricsCmd.AddCommand(sessionsCmd)
}

var metricsCmd = &cobra.Command{
	Use:   "metrics",
	Short: "Retrieve PayMeBack usage metrics",
	Long:  `Subcommands for viewing daily active users, monthly active users, and sessions.`,
}

var dauCmd = &cobra.Command{
	Use:   "dau",
	Short: "Get Daily Active Users (DAU)",
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()

		parsedResp, err := c.GetDailyActiveUsersApiV1MetricsDauGetWithResponse(ctx, addAdminBearerToken)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			metrics := parsedResp.JSON200
			fmt.Printf("Daily Active Users: %d\n", metrics.Count)
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}

var mauCmd = &cobra.Command{
	Use:   "mau",
	Short: "Get Monthly Active Users (MAU)",
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()

		parsedResp, err := c.GetMonthlyActiveUsersApiV1MetricsMauGetWithResponse(ctx, addAdminBearerToken)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			metrics := parsedResp.JSON200
			fmt.Printf("Monthly Active Users: %d\n", metrics.Count)
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}

var sessionsCmd = &cobra.Command{
	Use:   "sessions",
	Short: "Get overall session metrics",
	Run: func(cmd *cobra.Command, args []string) {
		c := getAdminClient()
		ctx := context.Background()

		parsedResp, err := c.GetSessionMetricsApiV1MetricsSessionsGetWithResponse(ctx, addAdminBearerToken)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if parsedResp.JSON200 != nil {
			metrics := parsedResp.JSON200
			fmt.Printf("Total Active Sessions: %d\n", metrics.TotalActiveSessions)
			fmt.Printf("Unique Users Logged In: %d\n", metrics.UniqueUsersLoggedIn)
		} else {
			fmt.Printf("API Error HTTP %d\n", parsedResp.StatusCode())
		}
	},
}
