package cmds

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "PayMeBack-cli",
	Short: "A CLI tool for interacting with the PayMeBack API",
	Long:  `A command line interface for managing PayMeBack backend services easily.`,
}

// Execute is called by main.main().
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
